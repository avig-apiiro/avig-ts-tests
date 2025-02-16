async function getFacebookData(endpoint: string, accessToken: string): Promise<any> {
    const url = `https://graph.facebook.com/v18.0/${endpoint}?access_token=${accessToken}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
}

// Example Usage
const accessToken = "your_access_token"; // Replace with a valid token
const endpoint = "me?fields=id,name";    // Fetch user ID & name

getFacebookData(endpoint, accessToken)
    .then(data => console.log(data))
    .catch(error => console.error("Error:", error));