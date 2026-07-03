from __future__ import annotations

from dataclasses import dataclass
from convokit import Corpus, Speaker, Utterance


@dataclass
class CorpusBuilder:
    convo_meta: dict
    utterances: list
    speakers: dict
    corpus_meta: dict


# Creates speakers, utterances, conversational metadata and corpus metadata for an experiment file
def experiment_to_convobuilder(exp_json, corpus_builder):

    # corpus_meta: question_map, stage_to_qids
    if "question_map" not in corpus_builder.corpus_meta.keys():
        corpus_builder.corpus_meta["question_map"] = dict()
    if "stage_to_qids" not in corpus_builder.corpus_meta.keys():
        corpus_builder.corpus_meta["stage_to_qids"] = dict()
    survey_stages = exp_json["stageMap"].keys()
    for stage in survey_stages:
        if "questions" in exp_json["stageMap"][stage].keys():
            if stage not in corpus_builder.corpus_meta["stage_to_qids"].keys():
                corpus_builder.corpus_meta["stage_to_qids"][stage] = []
            for q in exp_json["stageMap"][stage]["questions"]:
                qid = q.pop("id")
                corpus_builder.corpus_meta["stage_to_qids"][stage].append(qid)
                corpus_builder.corpus_meta["question_map"][qid] = q

    # Adding agents and their metadata
    for sid in exp_json["participantMap"].keys():
        corpus_builder.speakers[sid] = Speaker(id=sid, meta={"alias": exp_json["participantMap"][sid]["profile"]["name"], "speaker_type": "agent"})

    # Utterances
    for cid in exp_json["cohortMap"]:
        corpus_builder.convo_meta[cid] = {"agent_meta": {}}
        for round in exp_json["cohortMap"][cid]["chatMap"].values():
            for utt_data in round:
                sid = utt_data["senderId"]
                # Adding Mediators and their metadata
                if sid not in corpus_builder.speakers.keys():
                    if utt_data["profile"]["name"].lower() == "mediator":
                        speaker_type = "mediator"
                        corpus_builder.speakers[sid] = Speaker(id=sid, meta={"alias": utt_data["profile"]["name"], "speaker_type": speaker_type, "config": exp_json["agentMediatorMap"][utt_data["agentId"]]["promptMap"]})
                    else:
                        speaker_type = "agent"
                        corpus_builder.speakers[sid] = Speaker(id=sid, meta={"alias": utt_data["profile"]["name"], "speaker_type": speaker_type})
                # Adding explanation for utterance only for mediators
                if corpus_builder.speakers[sid].meta["speaker_type"] == "mediator":
                    utt = Utterance(
                        id=utt_data["id"],
                        speaker=corpus_builder.speakers[sid],
                        conversation_id=cid,
                        reply_to=None,
                        timestamp=utt_data["timestamp"]["seconds"],
                        text=utt_data["message"],
                        meta={"explanation": utt_data["explanation"]},
                    )
                else:
                    utt = Utterance(
                        id=utt_data["id"],
                        speaker=corpus_builder.speakers[sid],
                        conversation_id=cid,
                        reply_to=None,
                        timestamp=utt_data["timestamp"]["seconds"],
                        text=utt_data["message"],
                    )
                corpus_builder.utterances.append(utt)

        # Adding survey responses to convo_meta in the format of agent_meta: {agent_id: {exp_survey_response: response to survey}}
        for stage in survey_stages:
            if stage not in exp_json["cohortMap"][cid]["dataMap"].keys():
                continue
            stage_info = exp_json["cohortMap"][cid]["dataMap"][stage]
            if stage_info["kind"] == "survey":
                for sid, response in stage_info["participantAnswerMap"].items():
                    corpus_builder.convo_meta[cid]["agent_meta"][sid] = {"exp_survey_response": dict()}
                    for qid, answer_data in response.items():
                        if answer_data["kind"] == "text":
                            a = answer_data["answer"]
                        elif answer_data["kind"] == "scale":
                            a = answer_data["value"]
                        else:
                            a = answer_data["choiceId"]
                        corpus_builder.convo_meta[cid]["agent_meta"][sid]["exp_survey_response"][qid] = a

    return corpus_builder


def to_convokit(exp_json):
    corpus_builder = CorpusBuilder(dict(), [], dict(), dict())
    corpus_builder = experiment_to_convobuilder(exp_json, corpus_builder)
    corpus = Corpus(utterances=corpus_builder.utterances)
    for cid, meta in corpus_builder.convo_meta.items():
        for k, v in meta.items():
            corpus.get_conversation(cid).add_meta(k, v)
        prev_utt_id = None
        for utt in corpus.get_conversation(cid).get_chronological_utterance_list():
            utt._set_reply_to(prev_utt_id)
            prev_utt_id = utt.id

    for k, v in corpus_builder.corpus_meta.items():
        corpus.add_meta(k, v)

    return corpus
