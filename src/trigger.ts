import { log, requestConfluence, fetch } from './utils';
import { getContent } from './resolver';

export const onchange = async (event, context) => {
  // fetch page content
  const pageId = event.content.id;
  // const page = await getContent({ payload: pageId });
  // console.log(page);
  // parse links

  // fetch neo4j existing graph for this node
  // diff node... (delete old, create new)

  return true;
};