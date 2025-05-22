const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
console.log("👀 서버 시작 전 확인!");
require("dotenv").config();
console.log("✅ API 키:", process.env.UPSTAGE_API_KEY);

app.post("/chat", async (req, res) => {
    console.log("📥 POST /chat 호출됨");

    try {
        const { messages } = req.body;
        console.log("보낸 메시지:", messages);
        const response = await axios({
            method: "post",
            url: "https://api.upstage.ai/v1/chat/completions",
            headers: {
                Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
                "Content-Type": "application/json",
            },
            data: {
                model: "solar-mini-250422",
                messages,
                stream: true,
            },
            responseType: "stream",
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let buffer = "";

        response.data.on("data", (chunk) => {
            const lines = chunk.toString().split("\n");
            for (const line of lines) {
                if (line.startsWith("data:")) {
                    const payload = line.replace(/^data:\s*/, "");
                    if (payload === "[DONE]") {
                        res.write("event: end\ndata: [DONE]\n\n");
                        res.end();
                        return;
                    }

                    try {
                        const json = JSON.parse(payload);
                        const delta = json.choices?.[0]?.delta?.content || "";
                        buffer += delta;

                        // if (
                        //     buffer.includes("<eos>") ||
                        //     buffer.includes("<end>") ||
                        //     buffer.includes("</s>")
                        // ) {
                        //     const clean = buffer.replace(
                        //         /<eos>|<end>|<\/s>/g,
                        //         ""
                        //     );
                        //     res.write(`data: ${clean}\n\n`);
                        //     res.write("event: end\ndata: [DONE]\n\n");
                        //     res.end();
                        //     return;
                        // }

                        res.write(`data: ${delta}\n\n`);
                    } catch (e) {
                        console.error("parse error:", e);
                    }
                }
            }
        });

        response.data.on("end", () => {
            res.write("event: end\ndata: [DONE]\n\n");
            res.end();
        });

        response.data.on("error", (err) => {
            console.error("stream error:", err);
            res.end();
        });
    } catch (err) {
        console.error("Axios error:", err);
        res.status(500).send("Upstage API 연결 실패");
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Express 서버 실행 중: http://localhost:${PORT}`);
});
process.on("uncaughtException", (err) => {
    console.error("💥 uncaughtException:", err);
});
