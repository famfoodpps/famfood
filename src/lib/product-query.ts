export const PRODUCT_SELECT = `
  *,
  categories!inner(slug, name_en, name_zh),
  product_variants(*)
`;
