import jwt from 'jsonwebtoken';

const authenticateToken = async (request, response, next) => {
    console.log("Hello1");
    try {
        const token = await request.cookies.Token;
        console.log(token);
        if (!token) {
            return response.status(401).json({ error: "Access denied" });
        }
        console.log("hell");

        jwt.verify(token, process.env.SECRET, (error, decodedToken) => {
            if (error) {
                return response.status(403).json({ error: "Invalid token" });
            }
            request.userId = decodedToken.userId;
            next(); 
        });
        
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: "Internal server error" });
    }
};

export default authenticateToken;
