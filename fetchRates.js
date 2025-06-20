import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const cheerio = require("cheerio");
const fetch = require("node-fetch");
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const url = "https://www.apmcunjha.com/index.php/rates";

async function getRates() {
  try {
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
      const prices = parts[parts.length - 1].split("/");
      return {
        date,
        commodity: name,
        min_price: parseInt(prices[0]),
        max_price: parseInt(prices[1]),
      };
    });

    const { data: existing, error: checkError } = await supabase
      .from("apmc_rates")
      .select("id")
      .eq("date", date);

    if (checkError) throw checkError;
    if (existing.length > 0) {
      console.log(`✅ Rates already exist for ${date}`);
      return;
    }

    const { error } = await supabase.from("apmc_rates").insert(items);
    if (error) throw error;

    console.log(`✅ Inserted ${items.length} rates for ${date}`);
  } catch (err) {
    console.error("❌ Error fetching/inserting rates:", err.message);
  }
}

getRates();
