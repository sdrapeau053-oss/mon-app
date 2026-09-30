"use client";

import { useEffect, useState } from "react";
import { StatusChip, SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import {
  addMentalParkingItem,
  archiveMentalParkingItem,
  generateMentalParkingId,
  readMentalParkingItems,
} from "../mental-parking-storage";
import {
  MENTAL_PARKING_CATEGORY_LABELS,
  type MentalParkingCategory,
  type MentalParkingItem,
} from "../mental-parking-types";

const categories = Object.keys(MENTAL_PARKING_CATEGORY_LABELS) as MentalParkingCategory[];

export function MentalParkingPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [category, setCategory] = useState<MentalParkingCategory>("idee");
  const [items, setItems] = useState<MentalParkingItem[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    setItems(readMentalParkingItems());
  }, []);

  function addItem() {
    const cleanText = text.trim();
    if (!cleanText) return;
    const item: MentalParkingItem = {
      archived: false,
      category,
      createdAt: new Date().toISOString(),
      id: generateMentalParkingId(),
      text: cleanText,
    };
    setItems(addMentalParkingItem(item));
    setText("");
  }

  function archiveItem(id: string) {
    setItems(archiveMentalParkingItem(id));
  }

  const visibleItems = items
    .filter((item) => !item.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const activeCount = items.filter((item) => !item.archived).length;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          alignItems: "center",
          background: "rgba(20, 19, 17, 0.7)",
          border: "1px solid rgba(201, 168, 92, 0.14)",
          borderRadius: 10,
          cursor: "pointer",
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 8,
          padding: "9px 14px",
          width: "100%",
        }}
        type="button"
      >
        <span style={{ color: "#b8ad99", fontSize: 12.5, fontWeight: 650 }}>Parking mental</span>
        <span style={{ color: "#9a8e78", fontSize: 12 }}>
          {activeCount > 0 ? `${activeCount} élément${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}` : "Vide"} ›
        </span>
      </button>
    );
  }

  return (
    <SystemPanel compact style={{ marginBottom: 8, padding: "9px 10px" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 6 }}>
        <SystemSectionHeader title="Parking mental" />
        <button className="internal-button" onClick={() => setCollapsed(true)} style={{ fontSize: 11, padding: "3px 8px" }} type="button">
          Réduire
        </button>
      </div>
      <p className="editorial-body" style={{ fontSize: 12.5, margin: "0 0 7px" }}>
        Dépose ici ce qui occupe ton esprit.
      </p>
      <div style={{ display: "grid", gap: 7 }}>
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <input
            className="internal-control"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            placeholder="Ce qui tourne dans ma tête..."
            style={{ fontSize: 12.5, minHeight: 34, padding: "7px 9px" }}
            value={text}
          />
          <select
            className="internal-control"
            onChange={(event) => setCategory(event.target.value as MentalParkingCategory)}
            style={{ fontSize: 12.5, minHeight: 34, padding: "7px 9px" }}
            value={category}
          >
            {categories.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {MENTAL_PARKING_CATEGORY_LABELS[itemCategory]}
              </option>
            ))}
          </select>
          <button className="internal-button-primary" onClick={addItem} style={{ minHeight: 34, padding: "7px 12px" }} type="button">
            Ajouter
          </button>
        </div>

        {visibleItems.length ? (
          <div style={{ display: "grid", gap: 5 }}>
            {visibleItems.map((item) => (
              <article
                key={item.id}
                style={{
                  alignItems: "center",
                  background: "rgba(255, 250, 238, 0.03)",
                  border: "1px solid rgba(201, 168, 92, 0.12)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  padding: "7px 8px",
                }}
              >
                <StatusChip>{MENTAL_PARKING_CATEGORY_LABELS[item.category]}</StatusChip>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: "#f1e7d5", fontSize: 12.5, margin: 0, overflowWrap: "anywhere" }}>{item.text}</p>
                  <p className="editorial-body" style={{ fontSize: 11, margin: "2px 0 0" }}>
                    {new Date(item.createdAt).toLocaleDateString("fr-CA")}
                  </p>
                </div>
                <button className="internal-button" onClick={() => archiveItem(item.id)} style={{ padding: "5px 9px" }} type="button">
                  Archiver
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>
            Rien à retenir ici pour le moment.
          </p>
        )}
      </div>
    </SystemPanel>
  );
}
