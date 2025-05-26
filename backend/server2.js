const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const highlightToken = (text) => {
    return text
        .replace(/<eos>/g, "\x1b[41m<eos>\x1b[0m") // 빨간 배경
        .replace(/<end>/g, "\x1b[43m<end>\x1b[0m") // 노란 배경
        .replace(/<\/s>/g, "\x1b[45m</s>\x1b[0m"); // 보라 배경
};

app.post("/chat", async (req, res) => {
    console.log("\n POST /chat 호출됨");

    try {
        const { messages } = req.body;
        console.log(" 보낸 메시지:", messages);

        const response = await axios({
            method: "post",
            url: "https://api.upstage.ai/v1/chat/completions",
            headers: {
                Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`,
                "Content-Type": "application/json",
            },
            data: {
                model: "solar-1-mini-chat",
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
                    console.log("\n 수신된 JSON payload:");
                    console.log(payload); // ← 문자열 그대로 출력
                    if (payload === "[DONE]") {
                        console.log("\n [DONE] 수신 → 스트림 종료");
                        console.log(" 최종 buffer:", highlightToken(buffer)); // 전체 출력
                        res.write("event: end\ndata: [DONE]\n\n");
                        res.end();
                        return;
                    }

                    try {
                        const json = JSON.parse(payload);
                        const delta = json.choices?.[0]?.delta?.content || "";
                        buffer += delta;

                        const highlighted = highlightToken(delta);
                        console.log(" 수신된 delta:", highlighted); // 줄바꿈 포함 출력
                        res.write(`data: ${delta}\n\n`);
                    } catch (e) {
                        console.error(" JSON 파싱 에러:", e);
                    }
                }
            }
        });

        response.data.on("end", () => {
            console.log("\n 스트림 종료됨");
            res.write("event: end\ndata: [DONE]\n\n");
            res.end();
        });

        response.data.on("error", (err) => {
            console.error(" 스트림 오류:", err);
            res.end();
        });
    } catch (err) {
        console.error(" Axios 오류:", err.message);
        if (err.response) {
            console.error(
                " Upstage 응답:",
                err.response.status,
                err.response.data
            );
        }
        res.status(500).send("Upstage API 연결 실패");
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(` server2 실행 중: http://localhost:${PORT}`);
});
