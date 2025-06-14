// CartContext.js
import React, { createContext, useState } from 'react';

export const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  
  // Add a new item (or just append; you can merge duplicates if desired)
  function addToCart(newItem) {
    setItems(prev => [...prev, newItem]);
  }

  // Update quantity for a given itemId; remove if newQuantity ≤ 0
  function updateItemQuantity(itemId, newQuantity) {
    setItems(prev =>
      prev
        .map(i => (i.id === itemId ? { ...i, quantity: newQuantity } : i))
        .filter(i => i.quantity > 0)
    );
  }

  // Remove an item entirely by id
  function removeItem(itemId) {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  // Clear the entire cart
  function clearCart() {
    setItems([]);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateItemQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
