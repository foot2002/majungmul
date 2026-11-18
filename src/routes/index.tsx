import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SHELL_HTML } from "@/majungmul/shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "마중물" },
      { name: "description", content: "마중물 · 1분 사장님 AI 마케팅. 펌프에 붓는 한 바가지 물처럼, 하루 1분이 손님을 끌어올려요." },
      { property: "og:title", content: "마중물" },
      { property: "og:description", content: "1분 사장님 AI 마케팅" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    // 원본 로직은 브라우저(localStorage, DOM)에서만 동작하므로 화면이 뜬 뒤 시작
    import("@/majungmul/app").then((m) => m.startMajungmul());
  }, []);
  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />;
}
