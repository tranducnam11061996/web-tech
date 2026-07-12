export type BuyingGuideData = {
  heading: string;
  introduction: string;
  items: Array<{
    id: number;
    question: string;
    answer: string;
    defaultExpanded: boolean;
  }>;
};
