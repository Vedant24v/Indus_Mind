import os
import sys

# Add root directory to sys.path to ensure correct imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
