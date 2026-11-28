// Read-only discovery: this does not generate text or consume inference tokens.
const providers = [
  {
    label: "Claude",
    key: process.env.ANTHROPIC_API_KEY?.trim(),
    url: "https://api.anthropic.com/v1/models?limit=1000",
    headers: {
      "anthropic-version": "2026-10-21",
      ...(process.env.ANTHROPIC_WORKSPACE_ID?.trim()
        ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID.trim() }
        : {}),
    },
  },
  {
    label: "OpenAI",
    key: process.env.OPENAI_API_KEY?.trim(),
    url: "https://api.openai.com/v1/models",
    headers: {},
  },
];
const configured = providers.filter((provider) => provider.key);
if (!configured.length) {
  console.error(".env_dev에 ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 입력해 주세요.");
  process.exitCode = 1;
} else {
  const results = await Promise.allSettled(
    configured.map(async (provider) => {
      const response = await fetch(provider.url, {
        headers: { ...provider.headers, Authorization: `Bearer ${provider.key}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error("모델 목록 조회 실패");
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error("응답 형식 오류");
      return {
        models: result.data
          .filter((model) => typeof model.id === "string")
          .map(({ id }) => ({ id })),
        hasMore: result.has_more === true,
      };
    }),
  );
  results.forEach((result, index) => {
    const label = configured[index].label;
    if (result.status === "fulfilled") {
      console.log(`${label} 모델 목록`);
      console.table(result.value.models);
      if (result.value.hasMore) console.log("첫 1,000개 모델만 표시했어요.");
    } else {
      // Do not print raw errors, keys or provider response bodies.
      console.error(
        `${label} 모델 목록을 가져오지 못했어요. API 키·접근 권한·네트워크를 확인해 주세요.`,
      );
      process.exitCode = 1;
    }
  });
}
