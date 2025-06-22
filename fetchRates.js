import { load } from "cheerio";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const url = "https://www.apmcunjha.com/index.php/rates";

async function getRates() {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = load(html);

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
      const { error } = await supabase
        .from("apmc_rates")
        .delete()
        .not("id", "is", null);

      if (error) {
        console.error("Delete error:", error);
      } else {
        console.log("Row deleted successfully");
      }
    }

    const { error } = await supabase.from("apmc_rates").insert(items);
    if (error) throw error;
    console.log(`Inserted ${items.length} rates for ${date}`);
    const { er } = await supabase
      .from("apmc_rates")
      .delete()
      .is("commodity", null);

    if (er) {
      console.error("Error deleting null commodities:", error);
    }
  } catch (err) {
    console.error("Error fetching/inserting rates:", err.message);
  }
}

getRates();
