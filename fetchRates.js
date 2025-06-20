import cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const url = "https://www.apmcunjha.com/index.php/rates";

async function getRates() {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const marqueeText = $(".marquee-with-options-88").text().trim();
  const dateMatch = marqueeText.match(/Date\s*:\s*([^\n]+)/);
  if (!dateMatch) throw new Error("Date not found");
  const date = dateMatch[1].trim();

  const ratesRaw = marqueeText.replace(/^Date\s*:\s*[^\n]+\n?/i, "").trim();
  const items = ratesRaw.split(",").map((line) => {
    const parts = line.trim().split(/\s+/);
    const name = parts.slice(0, -1).join(" ");
    const [min_price, max_price] = parts.at(-1).split("/").map(Number);
    return { date, commodity: name, min_price, max_price };
  });

  const { data: existing } = await supabase
    .from("apmc_rates")
    .select("id")
    .eq("date", date);

  if (existing.length) {
    console.log(`✅ Rates for ${date} already exist.`);
    return;
  }

  const { error } = await supabase.from("apmc_rates").insert(items);
  if (error) throw error;

  console.log(`✅ Inserted ${items.length} rates for ${date}`);
}

getRates().catch((err) => console.error("❌ Error:", err.message));
