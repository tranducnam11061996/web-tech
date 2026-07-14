export type AttributeValueForm = {
  id?: number;
  value: string;
  apiKey: string;
  image: string;
  description: string;
  ordering: number;
  valueSort?: number;
  productCount?: number;
};
export type AttributeFormData = {
  id?: number;
  name: string;
  code: string;
  comment: string;
  filterCode: string;
  scope: 0 | 1;
  ordering: number;
  isHeader: boolean;
  isSearch: boolean;
  inSummary: boolean;
  productSpec: boolean;
  forProductOption: boolean;
  status: boolean;
  values: AttributeValueForm[];
  categoryIds: number[];
};

export type AttributeCategoryNode = {
  id: number;
  parentId: number;
  name: string;
};

export type AttributeListItem = {
  id: number;
  sequence: number;
  code: string;
  name: string;
  valueCount: number;
  categoryCount: number;
  productCount: number;
  isActive: boolean;
};
