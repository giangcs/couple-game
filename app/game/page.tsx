"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ROOM_ID = "couple-room";

export default function GamePage() {
  // ========================================
  // STATE
  // ========================================
  const [players, setPlayers] = useState<any[]>([]);
  const [myCards, setMyCards] = useState<any[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const isSubmitting = currentRound?.status === "submitting";
  const isVoting = currentRound?.status === "voting";
  const isFinished = currentRound?.status === "finished";

  // ========================================
  // LOAD DATA
  // ========================================
  async function loadSubmissions() {
    if (!currentRound) return;

    const { data, error } = await supabase
      .from("submissions")
      .select(
        `
        id,
        player_id,
        players (
          name
        ),
        white_cards (
          text
        )
      `,
      )
      .eq("round_id", currentRound.id);

    if (error) {
      console.error(error);
      return;
    }

    setSubmissions(data || []);
  }

  async function loadMySubmission() {
    const playerId = localStorage.getItem("playerId");

    if (!playerId || !currentRound) return;

    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("round_id", currentRound.id)
      .eq("player_id", playerId)
      .maybeSingle();

    setMySubmission(data);
  }

  async function loadRound() {
    const { data } = await supabase
      .from("rounds")
      .select(
        `
        *,
        black_cards (
          id,
          text
        )
      `,
      )
      .eq("room_id", ROOM_ID)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .single();

    setCurrentRound(data);
  }

  async function loadPlayers() {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", ROOM_ID);

    setPlayers(data || []);
  }
  async function loadCardCounts() {
    const { data } = await supabase.from("player_hands").select("player_id");

    console.log("hands", data);

    const counts: Record<string, number> = {};

    data?.forEach((row) => {
      counts[row.player_id] = (counts[row.player_id] || 0) + 1;
    });

    setCardCounts(counts);
  }

  async function loadMyCards() {
    const playerId = localStorage.getItem("playerId");

    const { data, error } = await supabase
      .from("player_hands")
      .select(
        `
        id,
        white_cards (
          id,
          text
        )
      `,
      )
      .eq("player_id", playerId);

    if (error) {
      console.error(error);
      return;
    }

    setMyCards(data || []);
  }
  // ========================================
  // GAME ACTIONS
  // ========================================
  async function drawCard() {
    const playerId = localStorage.getItem("playerId");

    if (!playerId) return;

    const { data: cards } = await supabase.from("white_cards").select("*");

    if (!cards?.length) return;

    const { data: dealtCards } = await supabase
      .from("player_hands")
      .select("white_card_id");

    const usedIds = dealtCards?.map((c) => c.white_card_id) || [];

    const availableCards = cards.filter((card) => !usedIds.includes(card.id));

    if (availableCards.length === 0) {
      return;
    }

    const randomCard =
      availableCards[Math.floor(Math.random() * availableCards.length)];

    await supabase.from("player_hands").insert({
      player_id: playerId,
      white_card_id: randomCard.id,
    });

    await loadMyCards();
    await loadCardCounts();
  }
  async function createRound() {
    const { data: existing } = await supabase
      .from("rounds")
      .select("id")
      .eq("room_id", ROOM_ID)
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (existing?.length) {
      return;
    }

    const { data: cards } = await supabase.from("black_cards").select("*");

    if (!cards?.length) return;

    const random = cards[Math.floor(Math.random() * cards.length)];

    await supabase.from("rounds").insert({
      room_id: ROOM_ID,
      black_card_id: random.id,
      status: "submitting",
    });

    await loadRound();
  }
  async function submitCard(handCard: any) {
    if (mySubmission) return;

    const playerId = localStorage.getItem("playerId");

    if (!playerId || !currentRound) return;

    await supabase.from("submissions").insert({
      round_id: currentRound.id,
      player_id: playerId,
      white_card_id: handCard.white_cards.id,
    });

    await supabase.from("player_hands").delete().eq("id", handCard.id);

    const { count } = await supabase
      .from("submissions")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("round_id", currentRound.id);

    console.log("submissions:", count, "players:", players.length);

    if (count === players.length) {
      await supabase
        .from("rounds")
        .update({
          status: "voting",
        })
        .eq("id", currentRound.id);
    }

    await loadSubmissions();
    await loadMySubmission();
    await loadMyCards();
  }
  async function ensureHand() {
    const playerId = localStorage.getItem("playerId");

    if (!playerId) return;

    const { data: player } = await supabase
      .from("players")
      .select("hand_initialized")
      .eq("id", playerId)
      .single();

    if (player?.hand_initialized) {
      return;
    }

    const { data: cards } = await supabase.from("white_cards").select("*");

    if (!cards?.length) return;

    const { data: dealtCards } = await supabase
      .from("player_hands")
      .select("white_card_id");

    const usedIds = dealtCards?.map((c) => c.white_card_id) || [];

    const availableCards = cards.filter((card) => !usedIds.includes(card.id));

    const shuffled = [...availableCards].sort(() => Math.random() - 0.5);

    const selected = shuffled.slice(0, 2);

    await supabase.from("player_hands").insert(
      selected.map((card) => ({
        player_id: playerId,
        white_card_id: card.id,
      })),
    );

    await supabase
      .from("players")
      .update({
        hand_initialized: true,
      })
      .eq("id", playerId);

    await loadMyCards();
    await loadCardCounts();
  }
  // ========================================
  // INITIAL LOAD
  // ========================================
  useEffect(() => {
    loadMyCards();
    loadCardCounts();
    loadRound();
  }, []);
  // ========================================
  // REALTIME SUBSCRIPTIONS
  // ========================================
  useEffect(() => {
    if (currentRound) {
      loadSubmissions();
      loadMySubmission();
    }
  }, [currentRound]);
  useEffect(() => {
    if (!currentRound?.id) return;

    const channel = supabase
      .channel(`submissions-${currentRound.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `round_id=eq.${currentRound.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("submissions")
            .select(
              `
              id,
              player_id,
              players (
                name
              ),
              white_cards (
                text
              )
            `,
            )
            .eq("round_id", currentRound.id);

          setSubmissions(data || []);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRound?.id]);
  // ========================================
  // RENDER
  // ========================================
  useEffect(() => {
    loadPlayers();

    const channel = supabase
      .channel("players-room")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        async () => {
          await loadPlayers();
          await loadCardCounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const playerId = localStorage.getItem("playerId");

    const channel = supabase
      .channel(`hand-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_hands",
        },
        async () => {
          await loadMyCards();
          await loadCardCounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("rounds")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
        },
        async () => {
          await loadRound();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!currentRound?.id) return;

    loadSubmissions();
    loadMySubmission();
  }, [currentRound?.id]);
  // ========================================
  // GAME FLOW
  // ========================================
  useEffect(() => {
    if (players.length >= 2) {
      ensureHand();
      createRound();
    }
  }, [players.length]);

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
            {player.score || 0}
            {" điểm"}
            {" - "}
            {cardCounts[player.id] || 0}
            {" lá"}
          </li>
        ))}
      </ul>

      <div className="mt-8 border p-6">{currentRound?.black_cards?.text}</div>

      {isVoting && (
        <div className="mt-8">
          <h2>Bài đã đánh</h2>

          {submissions.map((submission) => (
            <div key={submission.id} className="border p-4 mt-2">
              <div className="text-sm text-gray-500">
                {submission.players?.name}
              </div>

              <div className="mt-2">{submission.white_cards?.text}</div>
            </div>
          ))}
        </div>
      )}
      <button onClick={drawCard} className="border p-2 mt-4">
        Bốc bài
      </button>
      {isSubmitting && (
        <div className="mt-6">
          <h2>Bài của tôi</h2>

          {mySubmission && isSubmitting ? (
            <div className="border p-4 mt-2">
              Bạn đã đánh bài. Đang chờ người khác...
            </div>
          ) : (
            myCards.map((card) => (
              <div
                key={card.id}
                onClick={() => submitCard(card)}
                className="
          border
          p-4
          mt-2
          cursor-pointer
        "
              >
                {card.white_cards?.text}
              </div>
            ))
          )}
        </div>
      )}
      {isVoting && (
        <div
          className="
      fixed
      inset-0
      bg-black/50
      flex
      items-center
      justify-center
    "
        >
          <div
            className="
        bg-white
        p-6
        rounded
        w-[500px]
      "
          >
            <h2>Bình chọn bài thắng</h2>

            {submissions.map((submission) => (
              <button
                key={submission.id}
                className="
              block
              w-full
              border
              p-3
              mt-2
            "
              >
                <b>{submission.players?.name}</b>

                <br />

                {submission.white_cards?.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
