export const useShipping = () => {
  return {
    createLabel: async () => ({ labelUrl: "" }),
    getRates: async () => ([])
  };
};

