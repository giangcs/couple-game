"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ROOM_ID = "couple-room";

export default function Home() {
  const [name, setName] = useState("");
  const router = useRouter();

  async function joinGame() {
    if (!name.trim()) return;

    const { data, error } = await supabase
      .from("players")
      .insert({
        room_id: ROOM_ID,
        name,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    localStorage.setItem("playerId", data.id);

    router.push("/game");
  }

  return (
    <div className="p-10">
      <h1>Cards Against Humanity ❤️</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên của bạn"
        className="border p-2"
      />

      <button onClick={joinGame} className="border p-2 ml-2">
        Join
      </button>
    </div>
  );
}
