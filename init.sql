CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS repository_content (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,
    content TEXT NOT NULL,
    content_vector vector(1536)
);
