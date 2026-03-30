import axios from "axios";

export const submitCode = async (code: string, language_id: number, input: string) => {
    const response = await axios.post(
        "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
        {
            language_id,
            source_code: code,
            stdin: input
        }
    );

    return response.data;
};
