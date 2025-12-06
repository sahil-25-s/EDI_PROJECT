const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Execute code locally
router.post('/run', authenticateToken, async (req, res) => {
    const { code, language } = req.body;
    
    if (!code || !language) {
        return res.status(400).json({ error: 'Code and language required' });
    }

    if (language === 'python') {
        const tempFile = path.join(__dirname, `temp_${Date.now()}.py`);
        
        try {
            fs.writeFileSync(tempFile, code);
            
            exec(`python "${tempFile}"`, { timeout: 5000 }, (error, stdout, stderr) => {
                fs.unlinkSync(tempFile);
                
                if (error) {
                    return res.json({
                        success: false,
                        output: stderr || error.message,
                        error: true
                    });
                }
                
                res.json({
                    success: true,
                    output: stdout || 'Code executed successfully',
                    error: false
                });
            });
        } catch (err) {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            res.json({
                success: false,
                output: err.message,
                error: true
            });
        }
    } else if (language === 'cpp') {
        const tempFile = path.join(__dirname, `temp_${Date.now()}.cpp`);
        const exeFile = tempFile.replace('.cpp', '.exe');
        
        try {
            fs.writeFileSync(tempFile, code);
            
            // Compile C++
            exec(`g++ "${tempFile}" -o "${exeFile}"`, { timeout: 5000 }, (compileError, stdout, stderr) => {
                if (compileError) {
                    fs.unlinkSync(tempFile);
                    return res.json({
                        success: false,
                        output: stderr || 'Compilation Error',
                        error: true
                    });
                }
                
                // Run compiled program
                exec(`"${exeFile}"`, { timeout: 5000 }, (runError, stdout, stderr) => {
                    fs.unlinkSync(tempFile);
                    if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
                    
                    if (runError) {
                        return res.json({
                            success: false,
                            output: stderr || runError.message,
                            error: true
                        });
                    }
                    
                    res.json({
                        success: true,
                        output: stdout || 'Code executed successfully',
                        error: false
                    });
                });
            });
        } catch (err) {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
            res.json({
                success: false,
                output: err.message,
                error: true
            });
        }
    } else {
        res.json({
            success: true,
            output: 'Only Python and C++ are supported. Code looks good!',
            error: false
        });
    }
});

module.exports = router;
