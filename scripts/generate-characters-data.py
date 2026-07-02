#!/usr/bin/env python3
"""
Generate HSK-1 character data (radical, strokes, meaning, mnemonic) using LLM,
then import into Supabase.
"""
import json, os, re, sys, time
from openai import OpenAI

# Load config
API_KEY = os.environ.get('GENSPARK_TOKEN') or os.environ.get('OPENAI_API_KEY')
BASE_URL = os.environ.get('OPENAI_BASE_URL', 'https://www.genspark.ai/api/llm_proxy/v1')

if not API_KEY:
    # Try yaml config
    try:
        import yaml
        with open(os.path.expanduser('~/.genspark_llm.yaml')) as f:
            cfg = yaml.safe_load(f)
            API_KEY = cfg['openai']['api_key']
            BASE_URL = cfg['openai']['base_url']
            # Resolve env vars in api_key
            if API_KEY.startswith('${'):
                var = API_KEY.strip('${}')
                API_KEY = os.environ.get(var, '')
    except Exception:
        pass

if not API_KEY:
    print("ERROR: No API key found")
    sys.exit(1)

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

# Characters to generate data for
MISSING_CHARS = "一 七 三 上 下 不 东 两 个 么 九 也 习 书 买 了 事 二 五 些 亮 什 今 他 以 们 件 休 会 住 作 便 候 做 儿 元 先 八 公 六 关 兴 再 写 冷 几 出 分 到 前 包 医 十 千 午 半 卖 去 友 口 只 叫 可 号 司 吃 同 名 后 吗 吧 听 呢 和 哥 哪 唱 商 喂 喜 喝 四 回 在 坐 块 士 外 多 天 太 女 奶 她 妈 妹 姐 子 字 孩 它 宜 客 家 对 小 少 岁 工 市 师 常 年 床 店 开 弟 影 很 得 忙 怎 息 您 想 房 手 打 找 文 新 日 早 时 明 星 昨 晚 月 有 朋 服 期 本 机 条 来 杯 果 校 样 桌 椅 欢 歌 正 气 水 汉 没 漂 火 点 热 爱 爸 牛 狗 猫 玩 现 班 电 男 病 白 百 的 看 真 睡 知 租 穿 第 米 系 给 老 能 脑 苹 茶 菜 蛋 衣 西 要 见 视 觉 认 识 话 语 说 请 读 课 谁 谢 贵 起 超 车 边 还 这 道 那 都 里 钟 钱 问 间 院 雨 雪 零 非 面 题 飞 饭 饺 高 鸡".split()

BATCH_SIZE = 40

def generate_batch(chars: list[str], batch_num: int) -> list[dict]:
    """Generate character data for a batch using LLM."""
    chars_str = " ".join(chars)
    
    prompt = f"""You are a Chinese language expert. For each of the following {len(chars)} simplified Chinese characters, provide accurate data in JSON format.

Characters: {chars_str}

Return a JSON array where each element has:
- "character": the character
- "pinyin": pinyin with diacritical marks (e.g. "nǐ" not "ni3"). For characters with multiple readings, give the most common one.
- "radical": the radical (部首) of the character
- "stroke_count": integer number of strokes
- "frequency_rank": relative frequency rank within this batch (just number them sequentially starting from {(batch_num-1)*BATCH_SIZE + 1})
- "meaning_fr": brief French meaning (2-5 words max)
- "meaning_en": brief English meaning (2-5 words max)  
- "mnemonic_fr": short French mnemonic to help remember the character (1 sentence, creative, referencing the radical or character composition)
- "mnemonic_en": short English mnemonic (1 sentence)

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation. Ensure all pinyin uses diacritical marks (ā á ǎ à, ē é ě è, etc.), never numbers."""

    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": "You are a precise Chinese language data generator. Output only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )
    
    text = response.choices[0].message.content.strip()
    # Clean markdown if present
    if text.startswith("```"):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
    
    return json.loads(text)


def main():
    all_characters = []
    batches = [MISSING_CHARS[i:i+BATCH_SIZE] for i in range(0, len(MISSING_CHARS), BATCH_SIZE)]
    
    print(f"Total characters to generate: {len(MISSING_CHARS)}")
    print(f"Batches: {len(batches)}")
    
    for i, batch in enumerate(batches, 1):
        print(f"\n--- Batch {i}/{len(batches)} ({len(batch)} chars): {''.join(batch[:10])}... ---")
        try:
            result = generate_batch(batch, i)
            all_characters.extend(result)
            print(f"  Generated {len(result)} characters")
            # Show first 3
            for c in result[:3]:
                print(f"    {c['character']} | {c['pinyin']} | radical={c['radical']} | strokes={c['stroke_count']} | {c['meaning_fr']}")
        except Exception as e:
            print(f"  ERROR: {e}")
            # Save partial results
            break
        
        if i < len(batches):
            time.sleep(1)  # Rate limiting
    
    # Save results
    output_path = '/tmp/hsk1_characters_data.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_characters, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Generated {len(all_characters)} characters, saved to {output_path}")


if __name__ == '__main__':
    main()
