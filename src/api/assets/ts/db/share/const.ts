import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const share_db_dir_path = path.join(__dirname, '../../../../', 'db', 'share');
const share_db_layout_path = path.join(share_db_dir_path, 'layout.json');

export {
    __dirname,
    share_db_dir_path,
    share_db_layout_path
}