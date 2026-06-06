"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ROOM_ID = "couple-room";

export default function GamePage() {
  const [players, setPlayers] = useState<any[]>([]);
const [myCards, setMyCards] = useState<any[]>([]);
const [cardCounts, setCardCounts] =
  useState<Record<string, number>>({});
  const [blackCard, setBlackCard] =
  useState<any>(null);

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

  const { data, error } =
    await supabase
      .from("player_hands")
      .select(`
        id,
        white_cards (
          id,
          text
        )
      `)
      .eq("player_id", playerId);

  if (error) {
    console.error(error);
    return;
  }

  setMyCards(data || []);
}
async function drawCard() {
  const playerId =
    localStorage.getItem("playerId");

  if (!playerId) return;

  const { data: cards } =
    await supabase
      .from("white_cards")
      .select("*");

  if (!cards?.length) return;

const { data: dealtCards } =
  await supabase
    .from("player_hands")
    .select("white_card_id");

const usedIds =
  dealtCards?.map(
    (c) => c.white_card_id
  ) || [];

const availableCards =
  cards.filter(
    (card) =>
      !usedIds.includes(card.id)
  );

if (
  availableCards.length === 0
) {
  return;
}

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
      white_card_id: randomCard.id,
    });

  await loadMyCards();
  await loadCardCounts();
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
  loadBlackCard();
}, []);
useEffect(() => {
  if (players.length >= 2) {
    ensureHand();
  }
}, [players.length, myCards.length]);
async function ensureHand() {
  if (myCards.length >= 2) return;

  const playerId =
    localStorage.getItem("playerId");

  const need = 2 - myCards.length;

  const { data: cards } =
    await supabase
      .from("white_cards")
      .select("*");

  if (!cards) return;

  const { data: dealtCards } =
  await supabase
    .from("player_hands")
    .select("white_card_id");


const usedIds =
  dealtCards?.map(
    (c) => c.white_card_id
  ) || [];

const availableCards =
  cards.filter(
    (card) =>
      !usedIds.includes(card.id)
  );

const shuffled =
  [...availableCards].sort(
    () => Math.random() - 0.5
  );

const selected =
  shuffled.slice(0, need);
  
  await supabase
    .from("player_hands")
    .insert(
      selected.map((card) => ({
        player_id: playerId,
        white_card_id: card.id,
      }))
    );
    await loadMyCards();
await loadCardCounts();
}
async function loadBlackCard() {
  const { data } =
    await supabase
      .from("black_cards")
      .select("*");

  if (!data?.length) return;

  setBlackCard(
    data[
      Math.floor(
        Math.random() *
        data.length
      )
    ]
  );
}

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
  {blackCard?.text}
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
    {card.white_cards?.text}
  </div>
))}
</div>
    </div>
  );
}