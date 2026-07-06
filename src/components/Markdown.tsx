"use client";

import ReactMarkdown from "react-markdown";

// AI 응답(마크다운)을 앱 스타일에 맞춰 렌더링하는 공용 컴포넌트
export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <div style={{ fontSize: 13, fontWeight: 700, color: "#2A2A2A", margin: "10px 0 4px" }}>{children}</div>,
        h2: ({ children }) => <div style={{ fontSize: 13, fontWeight: 700, color: "#2A2A2A", margin: "10px 0 4px" }}>{children}</div>,
        h3: ({ children }) => <div style={{ fontSize: 12, fontWeight: 700, color: "#2A2A2A", margin: "8px 0 3px" }}>{children}</div>,
        h4: ({ children }) => <div style={{ fontSize: 12, fontWeight: 600, color: "#2A2A2A", margin: "8px 0 3px" }}>{children}</div>,
        p: ({ children }) => <p style={{ margin: "4px 0", lineHeight: 1.7 }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: 18 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "4px 0", paddingLeft: 18 }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 2, lineHeight: 1.6 }}>{children}</li>,
        strong: ({ children }) => <strong style={{ color: "#2A2A2A", fontWeight: 600 }}>{children}</strong>,
        hr: () => <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", margin: "8px 0" }} />,
        code: ({ children }) => <code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 4, fontSize: 11 }}>{children}</code>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#5A7BA0" }}>{children}</a>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
