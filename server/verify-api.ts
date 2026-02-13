
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifyAPI() {
    let output = "--- VERIFICACIÓN DE ENDPOINT /api/users ---\n";
    try {
        const response = await fetch("http://localhost:3000/api/users");
        if (!response.ok) {
            output += `ERROR: Status ${response.status}\n`;
            output += await response.text();
        } else {
            const users = await response.json();
            output += `Total usuarios en API: ${users.length}\n`;
            users.forEach((u: any, i: number) => {
                output += `- [${i+1}] ${u.email} | Estado UI: ${u.estado} | Plan UI: ${u.plan}\n`;
            });
        }
    } catch (error: any) {
        output += `ERROR DE CONEXIÓN AL API: ${error.message}\n`;
    }
    
    fs.appendFileSync(join(__dirname, "result.txt"), "\n" + output);
}

verifyAPI();
