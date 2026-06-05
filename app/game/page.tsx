"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WHITE_CARDS } from "@/lib/cards";

const ROOM_ID = "couple-room";

export default function GamePage() {
  const [players, setPlayers] = useState<any[]>([]);
const [myCards, setMyCards] = useState<any[]>([]);
const [cardCounts, setCardCounts] =
  useState<Record<string, number>>({});

  async function loadPlayers() {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", ROOM_ID);

    setPlayers(data || []);
  }

  async function loadMyCards() {
  const playerId =
    localStorage.getItem("playerId");

  const { data } = await supabase
    .from("player_hands")
    .select("*")
    .eq("player_id", playerId);

  setMyCards(data || []);
}
async function drawCard() {
  const playerId =
    localStorage.getItem("playerId");

  if (!playerId) return;

  const existingTexts =
    myCards.map(
      (card) => card.card_text
    );

  const availableCards =
    WHITE_CARDS.filter(
      (card) =>
        !existingTexts.includes(card)
    );

  if (availableCards.length === 0)
    return;

  const randomCard =
    availableCards[
      Math.floor(
        Math.random() *
        availableCards.length
      )
    ];

  await supabase
    .from("player_hands")
    .insert({
      player_id: playerId,
      card_text: randomCard,
    });
}
async function loadCardCounts() {
  const { data } = await supabase
    .from("player_hands")
    .select("player_id");

    console.log("hands", data);

  const counts: Record<
    string,
    number
  > = {};

  data?.forEach((row) => {
    counts[row.player_id] =
      (counts[row.player_id] || 0) + 1;
  });

  setCardCounts(counts);
}

  useEffect(() => {
    loadPlayers();
    loadMyCards();
    loadCardCounts();

    const playerId =
  localStorage.getItem("playerId");

const channel = supabase
  .channel(`hand-${playerId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "player_hands",
    },
    () => {
      loadMyCards();
      loadCardCounts();
    }
  )
  .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (players.length < 2) {
    return (
      <div className="p-10">
        <h1>Đang chờ người chơi...</h1>

        <ul>
          {players.map((player) => (
            <li key={player.id}>
  {player.name}
  {" - "}
  {cardCounts[player.id] || 0}
  {" lá"}
</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1>Game Started 🎉</h1>

      <h2>Người chơi</h2>

      <ul>
  {players.map((player) => (
    <li key={player.id}>
      {player.name}
      {" - "}
      {cardCounts[player.id] || 0}
      {" lá"}
    </li>
  ))}
</ul>

      <div className="mt-8 border p-6">
        Tôi không thể sống thiếu _____
      </div>
<button
  onClick={drawCard}
  className="border p-2 mt-4"
>
  Bốc bài
</button>
      <div className="mt-6">
  <h2>Bài của tôi</h2>

{myCards.map((card) => (
  <div
    key={card.id}
    className="border p-4 mt-2"
  >
    {card.card_text}
  </div>
))}
</div>
    </div>
  );
}