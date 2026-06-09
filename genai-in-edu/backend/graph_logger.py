# graph_logger.py
from neo4j import GraphDatabase
import os
from datetime import datetime

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
)

def create_user_profile(user_id: str, name: str):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            SET u.name = $name, u.created_at = coalesce(u.created_at, datetime())
            """,
            user_id=user_id,
            name=name
        )
# graph_logger.py
from neo4j import GraphDatabase
import os
from datetime import datetime

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
)

def create_user_profile(user_id: str, name: str):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            SET u.name = $name, u.created_at = coalesce(u.created_at, datetime())
            """,
            user_id=user_id,
            name=name
        )

def get_all_users():
    with driver.session() as session:
        result = session.run("MATCH (u:User) RETURN u.user_id AS user_id, u.name as name")
        return [{"user_id": r["user_id"], "name": r["name"]} for r in result]

def log_impatience_event(user_id: str, trigger_type: str):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            CREATE (i:ImpatienceEvent {
                trigger: $trigger_type,
                timestamp: datetime()
            })
            MERGE (u)-[:EXPERIENCED]->(i)
            """,
            user_id=user_id,
            trigger_type=trigger_type
        )

def get_impatience_history(user_id: str):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {user_id: $user_id})-[:EXPERIENCED]->(i:ImpatienceEvent)
            RETURN date(i.timestamp) AS date, count(i) AS events
            ORDER BY date
            """,
            user_id=user_id
        )
        return [{"date": str(record["date"]), "events": record["events"]} for record in result]

def log_session_start(user_id: str, session_id: str):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            MERGE (s:Session {session_id: $session_id})
            SET s.start_time = datetime()
            MERGE (u)-[:STARTED]->(s)
            """,
            user_id=user_id,
            session_id=session_id
        )

def log_interaction(
    user_id: str,
    content_id: str,
    event_type: str,
    modality: str = "text",
    duration: float = 0.0,
    completion: float = None,
    retries: int = None,
    hints_used: int = None,
    feedback_granularity: int = None
):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            MERGE (c:Content {content_id: $content_id})
            SET c.modality = $modality
            CREATE (u)-[:INTERACTED_WITH {
                event_type: $event_type,
                timestamp: datetime(),
                duration: $duration,
                completion: $completion,
                retries: $retries,
                hints_used: $hints_used,
                feedback_granularity: $feedback_granularity
            }]->(c)
            """,
            user_id=user_id,
            content_id=content_id,
            modality=modality,
            event_type=event_type,
            duration=duration,
            completion=completion,
            retries=retries,
            hints_used=hints_used,
            feedback_granularity=feedback_granularity
        )
# def log_disability_info(
#     user_id: str,
#     disability_name: str,
#     severity: str,
#     consent: bool
# ):
#     if not consent:
#         return  # respect privacy

#     with driver.session() as session:
#         session.run(
#             """
#             MERGE (u:User {user_id: $user_id})
#             MERGE (d:Disability {name: $disability_name})
#             MERGE (u)-[r:HAS_DISABILITY]->(d)
#             SET r.severity = $severity,
#                 r.consent = $consent,
#                 r.updated_at = datetime()
#             """,
#             user_id=user_id,
#             disability_name=disability_name,
#             severity=severity,
#             consent=consent
#         )
# def get_user_disabilities(user_id: str):
#     with driver.session() as session:
#         result = session.run(
#             """
#             MATCH (u:User {user_id: $user_id})-[r:HAS_DECLARED]->(d:Disability)
#             WHERE r.consent = true
#             RETURN d.type AS name, d.severity AS severity
#             """,
#             user_id=user_id
#         )

#         disabilities = {}
#         for record in result:
#             disabilities[record["name"]] = record["severity"]

#         return disabilities


# def upsert_user_disability(user_id: str, disability: str, severity: str, consent: bool):
#     with driver.session() as session:
#         session.run(
#             """
#             MERGE (u:User {user_id: $user_id})
#             MERGE (d:Disability {type: $disability})
#             SET d.severity = $severity,
#                 d.updated_at = datetime()
#             MERGE (u)-[r:HAS_DECLARED]->(d)
#             SET r.consent = $consent,
#                 r.updated_at = datetime()
#             """,
#             user_id=user_id,
#             disability=disability,
#             severity=severity,
#             consent=consent
#         )
def upsert_user_disability(user_id: str, 
                           condition: str, 
                           severity: str, 
                           consent: bool):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            MERGE (d:Disability {type: $condition})
            MERGE (u)-[r:HAS_DECLARED]->(d)
            SET r.severity = $severity,
                r.consent = $consent,
                r.updated_at = datetime()
            """,
            user_id=user_id,
            condition=condition,
            severity=severity,
            consent=consent
        )

def get_user_disabilities(user_id: str):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {user_id: $user_id})-[r:HAS_DECLARED]->(d:Disability)
            WHERE r.consent = true
            RETURN d.type AS name, r.severity AS severity
            """,
            user_id=user_id
        )

        disabilities = {}
        for record in result:
            disabilities[record["name"]] = record["severity"]

        return disabilities
def log_modality_event(user_id: str, modality: str, event: str, duration: float):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            MERGE (m:ObservedModality {type: $modality})
            MERGE (u)-[r:USES]->(m)
            SET r.count = coalesce(r.count, 0) + 1,
                r.total_duration = coalesce(r.total_duration, 0) + $duration,
                r.last_event = $event,
                r.updated_at = datetime()
            """,
            user_id=user_id,
            modality=modality,
            event=event,
            duration=duration
        )
def infer_observed_modality(user_id: str):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {user_id: $user_id})-[r:USES]->(m:ObservedModality)
            RETURN m.type AS modality,
                   r.count AS count,
                   r.total_duration AS duration
            """,
            user_id=user_id
        )

        scores = {}
        for record in result:
            scores[record["modality"]] = (
                record["count"] * 0.6 + record["duration"] * 0.4
            )

        if not scores:
            return None

        return max(scores, key=scores.get)
def get_modality_affinity(user_id: str):
    """
    Returns modality preference ranked by affinity score.
    """
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {user_id: $user_id})-[r:USES]->(m:ObservedModality)

            WITH
              m,
              r.count AS usage,
              r.total_duration AS duration

            WITH
              m,
              usage,
              duration,
              CASE
                WHEN duration > 0 AND usage > 0
                THEN duration * 1.0 / usage
                ELSE 0
              END AS avg_duration

            RETURN
              m.type AS modality,
              usage,
              duration,
              avg_duration,
              (0.6 * duration + 0.4 * usage) AS affinity_score
            ORDER BY affinity_score DESC
            """,
            user_id=user_id
        )

        return [
            {
                "modality": record["modality"],
                "usage": record["usage"],
                "duration": record["duration"],
                "avg_duration": record["avg_duration"],
                "score": record["affinity_score"],
            }
            for record in result
        ]
def log_emotional_state(user_id: str, anxiety_level: int):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            MERGE (e:EmotionalState {type: 'anxiety'})
            MERGE (u)-[r:REPORTS]->(e)
            SET r.level = $level,
                r.updated_at = datetime()
            """,
            user_id=user_id,
            level=anxiety_level
        )
def log_concept_mastery(user_id: str, concept: str, score: float):
    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})
            MERGE (c:Concept {name: $concept})
            MERGE (u)-[r:HAS_MASTERY]->(c)
            SET r.score = coalesce(r.score, 0) * 0.7 + $score * 0.3,
                r.attempts = coalesce(r.attempts, 0) + 1,
                r.updated_at = datetime()
            """,
            user_id=user_id,
            concept=concept,
            score=score
        )
def log_focus_score(user_id: str, score: float):
    from datetime import datetime
    import uuid

    session_id = str(uuid.uuid4())

    with driver.session() as session:
        session.run(
            """
            MERGE (u:User {user_id: $user_id})

            // Create a new session node
            CREATE (f:FocusSession {
                session_id: $session_id,
                score: $score,
                timestamp: datetime(),
                label: CASE
                    WHEN $score >= 70 THEN "High Focus"
                    WHEN $score >= 40 THEN "Moderate Focus"
                    ELSE "Low Focus"
                END
            })

            MERGE (u)-[:HAS_FOCUS_SESSION]->(f)
            """,
            user_id=user_id,
            score=score,
            session_id=session_id
        )
def get_focus_trend_data(user_id: str):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {user_id: $user_id})-[:HAS_FOCUS_SESSION]->(s:FocusSession)
            RETURN s.score AS score, s.timestamp AS time, s.label AS label
            ORDER BY s.timestamp
            """,
            user_id=user_id
        )
        return [record.data() for record in result]

def get_concept_mastery(user_id: str):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {user_id: $user_id})-[r:HAS_MASTERY]->(c:Concept)
            RETURN c.name AS concept, r.score AS score
            ORDER BY r.score DESC
            """,
            user_id=user_id
        )
        return [{"concept": record["concept"], "score": round(record["score"] * 100, 2)} for record in result]

def delete_user_data(user_id: str):
    with driver.session() as session:
        session.run(
            """
            MATCH (u:User {user_id: $user_id})
            // Delete relationships to shared conceptual nodes
            OPTIONAL MATCH (u)-[r1:HAS_MASTERY|HAS_DECLARED|USES|REPORTS|INTERACTED_WITH]->()
            DELETE r1
            WITH u
            // Delete unique data nodes created by the user
            OPTIONAL MATCH (u)-[:EXPERIENCED|STARTED|HAS_FOCUS_SESSION]->(n)
            DETACH DELETE n
            """,
            user_id=user_id
        )
