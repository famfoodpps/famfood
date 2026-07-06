"use client";

import { useEffect, useMemo, useState } from "react";
import { products } from "@/data/catalog";
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
  const [catalog, setCatalog] = useState<Product[]>(products);
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
    fetch("/api/products")
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.products)) setCatalog(payload.products);
      })
      .catch(() => setCatalog(products));
  }, []);

  const lines = useMemo<CartLine[]>(() => {
    return items
      .map((item) => {
        const product = catalog.find((candidate) => candidate.id === item.productId && candidate.active);
        if (!product) return null;
        const unitPrice = mode === "restaurant" ? product.restaurantPrice || product.publicPrice : product.publicPrice;
        return { ...item, product, unitPrice, lineTotal: unitPrice * item.quantity };
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

  function add(productId: string, quantity = 1) {
    commit((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        return current.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + quantity) } : item,
        );
      }
      return [...current, { productId, quantity: Math.max(1, quantity) }];
    });
  }

  function update(productId: string, quantity: number) {
    commit((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function remove(productId: string) {
    commit((current) => current.filter((item) => item.productId !== productId));
  }

  function clear() {
    commit(() => []);
  }

  return { add, clear, count, items, lines, ready, remove, total, update };
}
