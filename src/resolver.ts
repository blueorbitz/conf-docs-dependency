import api, { route } from '@forge/api';

export const getText = async (req: any) => {
  console.log(req);

  // Get content for space
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/space/STRAWHAT/content`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  console.log(`Response: ${response.status} ${response.statusText}`);
  console.log(await response.json());

  return 'Hello, world!';
};

export const getContext = async (req: any) => {
  return { ...req.context };
};
