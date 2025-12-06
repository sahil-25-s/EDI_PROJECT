# Code Execution Setup Guide

## Option 1: Use Judge0 API (Recommended - Real Execution)

### Step 1: Get Free API Key
1. Go to: https://rapidapi.com/judge0-official/api/judge0-ce
2. Click "Sign Up" (free)
3. Subscribe to FREE plan (50 requests/day)
4. Copy your API key

### Step 2: Add API Key
Open `backend/node/routes/execute.js` and replace:
```javascript
const RAPIDAPI_KEY = 'your_key_here';
```
With your actual key:
```javascript
const RAPIDAPI_KEY = 'abc123your-actual-key-here';
```

### Step 3: Restart Server
```bash
cd backend\node
node server.js
```

### Features:
✅ Real code execution
✅ Actual compilation errors
✅ Runtime error messages
✅ Supports Python, JavaScript, C++, Java
✅ Secure sandboxed environment

---

## Option 2: No API Key Needed (Fallback)

If you don't want to use Judge0 API, the system will show a fallback message.

### To use without API:
Just leave the API key as `'your_key_here'` and it will show:
```
Execution service temporarily unavailable. Please try again.
```

---

## Testing

### Test with Python:
```python
print("Hello World")
print(42)
```

### Test with JavaScript:
```javascript
console.log("Hello World");
console.log(42);
```

### Test with Error:
```python
print("Hello"  # Missing closing parenthesis
```

Should show:
```
SyntaxError: unexpected EOF while parsing
```

---

## Localhost Link

After starting server, open:
- **Main**: http://localhost:3000
- **Practice**: http://localhost:3000/practice-new.html
- **Problem**: http://localhost:3000/problem.html?id=two-sum

---

## Troubleshooting

**"Execution service unavailable"**
- Get API key from RapidAPI
- Add it to execute.js
- Restart server

**"Failed to execute code"**
- Check internet connection
- Verify API key is correct
- Check RapidAPI dashboard for quota

---

## Free Alternatives

If Judge0 doesn't work, you can use:
1. **Piston API**: https://github.com/engineer-man/piston
2. **Glot.io API**: https://glot.io/api
3. **JDoodle API**: https://www.jdoodle.com/compiler-api

Just replace the API endpoint and format in `execute.js`.
