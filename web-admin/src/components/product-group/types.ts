export type ProductGroupValueForm = {
  key: string;
  id?: number;
  name: string;
  description: string;
  ordering: number;
};

export type ProductGroupAttributeForm = {
  key: string;
  id?: number;
  name: string;
  ordering: number;
  values: ProductGroupValueForm[];
};

export type ProductGroupProductForm = {
  productId: number;
  sku: string;
  name: string;
  brandId: number;
  brandName: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  status: number;
  selections: Array<{ attributeKey: string; valueKey: string }>;
};

export type ProductGroupDetails = {
  id?: number;
  name: string;
  description: string;
  attributes: ProductGroupAttributeForm[];
  products: ProductGroupProductForm[];
  diagnostics?: {
    orphanProductIds: number[];
    orphanProductCount: number;
    invalidConfigCount: number;
    isVisible: boolean;
  };
};

export type ProductCatalogChoice = {
  id: number;
  storeSKU: string;
  proName: string;
  brandId: number;
  brandName: string;
  proThum: string;
  price: number;
  market_price: number;
  isOn: number;
  assignedGroupId?: number | null;
  assignedGroupName?: string | null;
};

export type ProductGroupListItem = {
  id: number;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
  attributeCount: number;
  validProductCount: number;
  orphanProductCount: number;
  sellableProductCount: number;
  isVisible: boolean;
};
