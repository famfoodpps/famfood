"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem, CartLine, Product } from "@/types/catalog";

type CartMode = "public" | "restaurant";
type CartUpdateDetail = {
  mode: CartMode;
  items: CartItem[];
};

const keyFor = (mode: CartMode) => `famfood-${mode}-cart`;
const CART_UPDATE_EVENT = "famfood-cart-updated";

function readStoredCart(mode: CartMode) {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(keyFor(mode));
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeStoredCart(mode: CartMode, items: CartItem[]) {
  window.localStorage.setItem(keyFor(mode), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent<CartUpdateDetail>(CART_UPDATE_EVENT, { detail: { mode, items } }));
}

export function useCart(mode: CartMode = "public") {
  const [items, setItems] = useState<CartItem[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadCart = () => setItems(readStoredCart(mode));
    const onCartUpdate = (event: Event) => {
      const detail = (event as CustomEvent<CartUpdateDetail>).detail;
      if (detail?.mode === mode && Array.isArray(detail.items)) setItems(detail.items);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === keyFor(mode)) loadCart();
    };

    queueMicrotask(() => {
      loadCart();
      setReady(true);
    });

    window.addEventListener(CART_UPDATE_EVENT, onCartUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CART_UPDATE_EVENT, onCartUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [mode]);

  useEffect(() => {
    const productIds = [...new Set(readStoredCart(mode).map((item) => item.productId))];
    if (!productIds.length) return;
    fetch(`/api/products?ids=${encodeURIComponent(productIds.join(","))}&pageSize=100`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.products)) setCatalog(payload.products);
      })
      .catch(() => setCatalog([]));
  }, [items, mode]);

  const lines = useMemo<CartLine[]>(() => {
    return items
      .map((item) => {
        const product = catalog.find((candidate) => candidate.id === item.productId && candidate.active);
        if (!product) return null;
        const variant = item.variantId ? product.variants.find((candidate) => candidate.id === item.variantId && candidate.active) : undefined;
        const unitPrice = mode === "restaurant"
          ? (variant ? variant.restaurantPrice : product.restaurantPrice)
          : (variant ? variant.promotionPrice ?? variant.retailPrice : product.publicPrice);
        if (unitPrice === null || unitPrice <= 0) return null;
        return { ...item, product, variant, unitPrice, lineTotal: unitPrice * item.quantity };
      })
      .filter(Boolean) as CartLine[];
  }, [catalog, items, mode]);

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  function commit(updater: (current: CartItem[]) => CartItem[]) {
    const nextItems = updater(readStoredCart(mode));
    setItems(nextItems);
    writeStoredCart(mode, nextItems);
  }

  function add(productId: string, quantity = 1, variantId?: string) {
    commit((current) => {
      const existing = current.find((item) => item.productId === productId && item.variantId === variantId);
      if (existing) {
        return current.map((item) =>
          item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.max(1, item.quantity + quantity) } : item,
        );
      }
      return [...current, { productId, variantId, quantity: Math.max(1, quantity) }];
    });
  }

  function update(productId: string, quantity: number, variantId?: string) {
    commit((current) =>
      current
        .map((item) => (item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function remove(productId: string, variantId?: string) {
    commit((current) => current.filter((item) => item.productId !== productId || item.variantId !== variantId));
  }

  function clear() {
    commit(() => []);
  }

  return { add, clear, count, items, lines, ready, remove, total, update };
}
