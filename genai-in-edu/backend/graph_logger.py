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
    hints_used: int = None
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
                hints_used: $hints_used
            }]->(c)
            """,
            user_id=user_id,
            content_id=content_id,
            modality=modality,
            event_type=event_type,
            duration=duration,
            completion=completion,
            retries=retries,
            hints_used=hints_used
        )
