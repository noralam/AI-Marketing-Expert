module.exports = {
	apps: [
		{
			name: 'aime-oauth-proxy',
			script: 'server.js',
			instances: 1,
			exec_mode: 'fork',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
			},
			max_memory_restart: '150M',
			log_date_format: 'YYYY-MM-DD HH:mm:ss',
			error_file: './logs/error.log',
			out_file: './logs/output.log',
			merge_logs: true,
		},
	],
};
