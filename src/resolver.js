export const getText = (req) => {
  console.log(req);
  return 'Hello, world!';
};

export const getContext = async (req) => {
  return { ...req.context };
};
