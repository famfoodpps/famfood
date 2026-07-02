"use client";

import { useEffect, useMemo, useState } from "react";
import { products } from "@/data/catalog";
import type { CartItem, CartLine, Product } from "@/types/catalog";

type CartMode = "public" | "restaurant";

const keyFor = (mode: CartMode) => `famfood-${mode}-cart`;

export function useCart(mode: CartMode = "public") {
  const [items, setItems] = useState<CartItem[]>([]);
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(keyFor(mode));
      if (stored) {
        try {
          setItems(JSON.parse(stored));
        } catch {
          setItems([]);
        }
      }
      setReady(true);
    });
  }, [mode]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(keyFor(mode), JSON.stringify(items));
  }, [items, mode, ready]);

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
        const unitPrice = mode === "restaurant" ? product.restaurantPrice : product.publicPrice;
        return { ...item, product, unitPrice, lineTotal: unitPrice * item.quantity };
      })
      .filter(Boolean) as CartLine[];
  }, [catalog, items, mode]);

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  function add(productId: string, quantity = 1) {
    setItems((current) => {
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
    setItems((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function remove(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  function clear() {
    setItems([]);
  }

  return { add, clear, count, items, lines, ready, remove, total, update };
}
