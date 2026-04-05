import Editor from '@monaco-editor/react';
import { cn } from '@repo/ui/lib/utils';
import { useTheme } from 'next-themes';

interface CodeEditorProps {
	value: string;
	onChange: (value: string | undefined) => void;
	language?: string;
	className?: string;
}

const CodeEditor = ({
	value,
	onChange,
	language = 'javascript',
	className,
}: CodeEditorProps) => {
	const { theme } = useTheme();
	const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';

	return (
		<div className={cn('rounded-md border h-full', className)}>
			<Editor
				height='100%'
				language={language}
				theme={monacoTheme}
				value={value}
				onChange={onChange}
				options={{
					// Layout
					minimap: { enabled: false },
					fontSize: 14,
					lineNumbers: 'on',
					automaticLayout: true,
					scrollBeyondLastLine: false,
					padding: { top: 12, bottom: 12 },

					// Brackets & Indentation
					bracketPairColorization: { enabled: true },
					guides: { bracketPairs: true, indentation: true },
					autoClosingBrackets: 'always',
					autoClosingQuotes: 'always',
					autoIndent: 'full',
					tabSize: 4,
					detectIndentation: false,

					// Coding helpers
					suggestOnTriggerCharacters: true,
					acceptSuggestionOnEnter: 'on',
					quickSuggestions: true,
					parameterHints: { enabled: true },
					wordBasedSuggestions: 'currentDocument',
					folding: true,
					formatOnPaste: true,

					// Cursor & Scrolling
					cursorBlinking: 'smooth',
					cursorSmoothCaretAnimation: 'on',
					// smoothScrolling: true,
					roundedSelection: true,

					// Selection
					linkedEditing: true,
					matchBrackets: 'always',
					selectionHighlight: true,
					occurrencesHighlight: 'singleFile',

					readOnly: false,
				}}
			/>
		</div>
	);
};

export default CodeEditor;
