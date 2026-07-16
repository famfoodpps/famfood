export const PRODUCT_SELECT = `
  *,
  categories!inner(slug, name_en, name_zh, sort_order),
  product_variants(*)
`;
