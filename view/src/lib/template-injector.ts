import type { Question, SerializedQuestion } from "../types";

/**
 * Serialize a Question to the template format expected by canvas games.
 */
export function serializeQuestion(
  question: Question,
  isLastQuestion: boolean = false
): SerializedQuestion {
  return {
    type: question.question_type,
    prompt: question.question,
    choices: question.choices.map((c) => ({
      text: c.text,
      is_correct: !!c.is_correct,
      explanation: c.explanation ?? "",
    })),
    isLastQuestion,
  };
}

const QUESTION_BLOCK = /const\s+QUESTION\s*=\s*\{[\s\S]*?\};/;

/**
 * Injects question data into template HTML.
 */
export function injectQuestionIntoTemplate(
  html: string,
  question: Question,
  isLastQuestion: boolean = false,
  sessionId?: string
): string {
  const serialized = serializeQuestion(question, isLastQuestion);
  const json = JSON.stringify(serialized, null, 2);
  const replacement = `const QUESTION = ${json};`;

  let result = html;

  if (QUESTION_BLOCK.test(result)) {
    result = result.replace(QUESTION_BLOCK, replacement);
  } else if (result.includes("/*__QUESTION_JSON__*/")) {
    result = result.replace("/*__QUESTION_JSON__*/", json);
  } else {
    result = result.replace(
      /<body[^>]*>/i,
      (match) => `${match}\n<script>${replacement}</script>`
    );
  }

  result = injectResponsiveCSS(result);

  // Inject sessionId as a global BEFORE the shim reads it.
  // This is done as raw string manipulation (not via template literals)
  // so Vite's minifier can't interfere with the value.
  if (sessionId) {
    const sidScript = '<script>window.__QUIZ_SESSION_ID=' + JSON.stringify(sessionId) + ';</script>';
    result = result.replace(/<body[^>]*>/i, (match) => match + sidScript);
  }

  result = appendPostMessageShim(result);

  return result;
}

function injectResponsiveCSS(html: string): string {
  const css = `
<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.wrap {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
canvas#game {
  width: 100% !important;
  height: auto !important;
  max-width: 720px;
  max-height: 540px;
  display: block;
}
</style>`.trim();

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n${css}`);
  }
  return css + "\n" + html;
}

function appendPostMessageShim(html: string): string {
  const shim = [
    "<script>",
    "(function(){",
    "  var SESSION_ID = window.__QUIZ_SESSION_ID || null;",
    "  function post(type, detail){",
    "    try { parent.postMessage(Object.assign({type: type, sessionId: SESSION_ID}, detail), '*'); } catch(e){}",
    "  }",
    "",
    "  Object.defineProperty(window, '__report', {",
    "    value: function(choiceIndex, isCorrect, explanation){",
    "      post('quiz-choice', { choiceIndex: choiceIndex, isCorrect: !!isCorrect, explanation: explanation || '' });",
    "    },",
    "    writable: false",
    "  });",
    "",
    "  var iv = setInterval(function(){",
    "    try {",
    "      if (window.engine && window.engine.end && !window.engine.__wrapped){",
    "        var _end = window.engine.end.bind(window.engine);",
    "        window.engine.end = function(ok, explanation){",
    "          try { post('quiz-end', { isCorrect: !!ok, explanation: explanation || '' }); } catch(e){}",
    "          return _end(ok, explanation);",
    "        };",
    "        window.engine.__wrapped = true;",
    "        try { post('quiz-ready', {}); } catch(e){}",
    "        clearInterval(iv);",
    "      }",
    "    } catch(e) {}",
    "  }, 50);",
    "})();",
    "</script>",
  ].join("\n");

  if (/(<\/body>\s*<\/html>\s*)$/i.test(html)) {
    return html.replace(/<\/body>\s*<\/html>\s*$/i, `${shim}\n</body></html>`);
  }
  return html + "\n" + shim;
}
