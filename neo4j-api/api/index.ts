import type { VercelRequest, VercelResponse } from '@vercel/node';
import neo4j from 'neo4j-driver';

export default async (request: VercelRequest, response: VercelResponse) => {
  console.log(request.method, { query: request.body });

  if (request.method?.toUpperCase() === 'GET')
    return response.json({ message: 'welcome!' });

  if (request.body == null)
    return response.status(400).json({ message: 'empty input' });

  const { NEO4J_CONNECTION, NEO4J_PASSWORD } = process.env;
  const driver = neo4j.driver(NEO4J_CONNECTION ?? '', neo4j.auth.basic('neo4j', NEO4J_PASSWORD ?? ''));
  const session = driver.session({ database: 'neo4j' });

  let errorMessage: string = '';
  let writeResult;
  try {
    const query = request.body;
    writeResult = await session.writeTransaction(tx =>
      tx.run(query)
    );
  } catch (error) {
    console.error(error);
    errorMessage = error.message;
    response.status(500);
  }
  finally {
    await session.close();
  }

  if (errorMessage === '')
    return response.send(writeResult?.records ?? { status: 'Ok' });
  else
    return response.status(500).send({ message: errorMessage });
};