export const debounce = (cb: any, delay: number) => {
	let timeout: NodeJS.Timeout;
	return function executedFunction(...args: any[]) {
		const exec = () => {
			clearTimeout(timeout);
			cb(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(exec, delay);
	};
};
