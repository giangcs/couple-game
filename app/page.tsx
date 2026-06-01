"use client";

import { supabase } from "@/lib/supabase";

export default function Home() {
  async function test() {
    console.log("Connected");

    const { data, error } =
      await supabase.from("rooms").select("*");

    console.log(data);
    console.log(error);
  }

  return (
    <button onClick={test}>
      Test Supabase
    </button>
  );
}