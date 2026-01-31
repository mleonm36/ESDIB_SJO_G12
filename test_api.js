const API_KEY = '5929e0dbebc941dc3124dd37c7248acca821170a522179775118ffe50fbf19c0';

async function test() {
    try {
        const res = await fetch('http://localhost:4000/api/pets', {
            headers: { 'x-api-key': API_KEY }
        });

        if (res.ok) {
            const json = await res.json();
            console.log("Status: 200 OK");
            console.log("Count:", json.length);
            if (json.length > 0) {
                console.log("First Movie Type:", json[0].animal); // Should be "Acción" or similar
                console.log("First Movie Title:", json[0].nombre);
                console.log("Photos:", JSON.stringify(json[0].photos));
            } else {
                console.log("Empty Array");
            }
        } else {
            console.log("Error Status:", res.status);
            const txt = await res.text();
            console.log("Body:", txt);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

test();