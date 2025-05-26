<template>
    <div class="p-4">
        <h2 class="text-xl font-bold mb-2">💬 Upstage 채팅</h2>
        <textarea
            v-model="message"
            class="w-full border p-2"
            rows="3"
            placeholder="질문을 입력하세요"
            @keydown.enter.prevent
            @keydown.enter="sendMessage"
        />
        <button
            @click="sendMessage"
            class="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
            보내기
        </button>

        <div class="mt-4 whitespace-pre-wrap border p-4 min-h-[100px]">
            <p>{{ streamedText }}</p>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";

const message = ref("");
const streamedText = ref("");

const sendMessage = async () => {
    streamedText.value = "";

    const response = await fetch("http://localhost:3002/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ role: "user", content: message.value }],
        }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
            if (line.startsWith("data:")) {
                const data = line.replace("data: ", "");
                if (data === "[DONE]") return;
                streamedText.value += data;
            }
        }
    }
};
</script>
