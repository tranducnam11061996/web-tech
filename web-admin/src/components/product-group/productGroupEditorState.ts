import type {
  ProductGroupAttributeForm,
  ProductGroupDetails,
  ProductGroupValueForm,
} from './types';

export const PRODUCT_GROUP_VALUE_LIMIT = 50;
export const PRODUCT_GROUP_VALUE_NAME_LIMIT = 150;

export function normalizeProductGroupValueName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeProductGroupOrdering(attributes: ProductGroupAttributeForm[]) {
  return attributes.map((attribute, attributeIndex) => ({
    ...attribute,
    ordering: attributeIndex,
    values: attribute.values.map((value, valueIndex) => ({ ...value, ordering: valueIndex })),
  }));
}

export function prependProductGroupAttribute(
  attributes: ProductGroupAttributeForm[],
  attribute: ProductGroupAttributeForm,
) {
  return normalizeProductGroupOrdering([attribute, ...attributes]);
}

type QuickValueResult = {
  values: ProductGroupValueForm[];
  valueKey: string;
};

export function createOrReuseProductGroupValue(
  values: ProductGroupValueForm[],
  rawName: string,
  createKey: () => string,
): QuickValueResult {
  const name = normalizeProductGroupValueName(rawName);
  if (!name) throw new Error('Vui lòng nhập tên value.');
  if (name.length > PRODUCT_GROUP_VALUE_NAME_LIMIT) {
    throw new Error(`Tên value không được vượt quá ${PRODUCT_GROUP_VALUE_NAME_LIMIT} ký tự.`);
  }

  const normalizedName = name.toLocaleLowerCase('vi-VN');
  const existing = values.find(
    (value) => normalizeProductGroupValueName(value.name).toLocaleLowerCase('vi-VN') === normalizedName,
  );
  if (existing) return { values, valueKey: existing.key };

  const blankIndex = values.findIndex((value) => !normalizeProductGroupValueName(value.name));
  if (blankIndex >= 0) {
    return {
      values: values.map((value, index) => index === blankIndex ? { ...value, name } : value),
      valueKey: values[blankIndex].key,
    };
  }

  if (values.length >= PRODUCT_GROUP_VALUE_LIMIT) {
    throw new Error(`Mỗi thuộc tính chỉ hỗ trợ tối đa ${PRODUCT_GROUP_VALUE_LIMIT} value.`);
  }

  const value: ProductGroupValueForm = {
    key: createKey(),
    name,
    description: '',
    ordering: values.length,
  };
  return { values: [...values, value], valueKey: value.key };
}

export function assignQuickValueToProduct(
  group: ProductGroupDetails,
  input: {
    attributeKey: string;
    productId: number;
    name: string;
    createKey: () => string;
  },
) {
  const attribute = group.attributes.find((candidate) => candidate.key === input.attributeKey);
  if (!attribute) throw new Error('Thuộc tính không còn tồn tại.');
  if (!group.products.some((product) => product.productId === input.productId)) {
    throw new Error('SKU không còn thuộc group.');
  }

  const result = createOrReuseProductGroupValue(attribute.values, input.name, input.createKey);
  return {
    ...group,
    attributes: normalizeProductGroupOrdering(group.attributes.map((candidate) => (
      candidate.key === input.attributeKey ? { ...candidate, values: result.values } : candidate
    ))),
    products: group.products.map((product) => {
      if (product.productId !== input.productId) return product;
      const withoutAttribute = product.selections.filter(
        (selection) => selection.attributeKey !== input.attributeKey,
      );
      return {
        ...product,
        selections: [...withoutAttribute, {
          attributeKey: input.attributeKey,
          valueKey: result.valueKey,
        }],
      };
    }),
  };
}
