import { mount } from 'svelte';
import PdfViewer from '../../pdf/PdfViewer.svelte';

const app = mount(PdfViewer, { target: document.getElementById('app')! });

export default app;
