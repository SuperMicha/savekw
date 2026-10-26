import { useState } from "react";

interface InfoPanelProps {
  shortInfo: string;
  fullInfo: string;
}

export default function InfoPanel({ shortInfo, fullInfo }: InfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4"
      style={{ backgroundColor: "#E3F2FD" }}
    >
      <div className="flex gap-3">
        {/* Іконка (i) */}
        <div className="flex-shrink-0">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-sm font-bold text-blue-600"
            style={{ minWidth: "24px", minHeight: "24px" }}
          >
            i
          </div>
        </div>

        {/* Текст */}
        <div className="flex-1">
          {!isExpanded ? (
            <>
              <div className="text-sm leading-relaxed text-gray-700">
                {shortInfo}
              </div>
              <button
                onClick={() => setIsExpanded(true)}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Читати більше інформації...
              </button>
            </>
          ) : (
            <>
              <div
                className="info-panel-content text-sm leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{ __html: fullInfo }}
                style={{
                  lineHeight: "1.6",
                }}
              />
              <button
                onClick={() => setIsExpanded(false)}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Згорнути
              </button>
              <style jsx>{`
                .info-panel-content :global(table) {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 16px 0;
                  font-size: 13px;
                }
                .info-panel-content :global(th) {
                  background-color: #e3f2fd;
                  padding: 10px;
                  text-align: left;
                  border: 1px solid #90caf9;
                  font-weight: 600;
                }
                .info-panel-content :global(td) {
                  padding: 10px;
                  border: 1px solid #90caf9;
                }
                .info-panel-content :global(tr:nth-child(even)) {
                  background-color: #f5f5f5;
                }
                .info-panel-content :global(p) {
                  margin: 12px 0;
                }
                .info-panel-content :global(h4) {
                  margin: 20px 0 10px 0;
                  font-size: 15px;
                  font-weight: 600;
                  color: #1976d2;
                }
              `}</style>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
