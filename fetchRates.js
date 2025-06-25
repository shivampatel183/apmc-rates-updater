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
      .select("id");

    if (checkError) throw checkError;

    if (existing.length > 0) {
      const { error: deleteError } = await supabase
        .from("apmc_rates")
        .delete()
        .not("id", "is", null);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return;
      }
      console.log("Existing data deleted successfully");
    }

    const { error: insertError } = await supabase
      .from("apmc_rates")
      .insert(items);
    if (insertError) throw insertError;

    console.log(`Inserted ${items.length} rates for ${date}`);

    const { error: nullDeleteError } = await supabase
      .from("apmc_rates")
      .delete()
      .is("commodity", null);

    if (nullDeleteError) {
      console.error("Error deleting null commodities:", nullDeleteError);
    }
  } catch (err) {
    console.error("Error fetching/inserting rates:", err.message);
  }
}

getRates();
