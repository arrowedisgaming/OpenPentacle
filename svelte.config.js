import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';

const useNode = process.env.ADAPTER === 'node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: useNode
			? adapterNode({ out: 'build' })
			: adapterCloudflare()
	}
};

export default config;
