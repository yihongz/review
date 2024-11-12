require('dotenv').config();
const { Pool } = require('pg');
const { toSql } = require('pgvector');

class EmbeddingService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DATABASE_USER,
      host: process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      password: process.env.DATABASE_PASSWORD,
      port: process.env.DATABASE_PORT,
    });
  }

  async saveEmbedding(filePath, content, embedding) {
    try {
      await this.pool.query(
        'INSERT INTO repository_content (file_path, content, content_vector) VALUES ($1, $2, $3)',
        [filePath, content, toSql(embedding)]
      );
      console.log(`Saved embedding for: ${filePath}`);
    } catch (error) {
      console.error('Error saving embedding to database:', error);
    }
  }

  async fetchEmbeddings() {
    try {
      const { rows } = await this.pool.query(
        'SELECT id, file_path, content, content_vector FROM repository_content'
      );
      return rows;
    } catch (error) {
      console.error('Error fetching embeddings from database:', error);
      return [];
    }
  }

  async searchRelevantDocuments(queryEmbedding, n_results = 1) {
    const queryVectorSql = toSql(queryEmbedding);
    const sqlQuery = `
      SELECT id, file_path, content_vector
      FROM repository_content
      ORDER BY content_vector <-> $1::vector(1536)
      LIMIT $2;
    `;

    try {
      const { rows } = await this.pool.query(sqlQuery, [queryVectorSql, n_results]);
      return rows;
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  async embeddingsExist() {
    try {
      const { rows } = await this.pool.query('SELECT 1 FROM repository_content LIMIT 1');
      return rows.length > 0;
    } catch (error) {
      console.error('Error while checking embeddings in the database:', error);
      return false;
    }
  }

  async closeConnection() {
    await this.pool.end();
  }
}

module.exports = EmbeddingService;